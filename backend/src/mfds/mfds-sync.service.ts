import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { FoodNutrition } from '../entities/food-nutrition.entity';
import { HealthFunctionalItem } from '../entities/health-functional-item.entity';
import { inferOhaengTags } from '../saju/ohaeng-tagger';

/**
 * 식품안전나라(openapi.foodsafetykorea.go.kr) OpenAPI → PostgreSQL 야간 동기화 (마스터 프롬프트 §3).
 *
 *  요청 형식:  {base}/api/{인증키}/{서비스ID}/json/{시작인덱스}/{끝인덱스}[/{조건}]
 *  응답 형식:  { "<서비스ID>": { total_count, row: [...], RESULT: { CODE, MSG } } }
 *    - 정상 CODE = "INFO-000", 데이터없음 = "INFO-200", 그 외 = 오류(인증키/요청).
 *    - 한 번에 최대 1000행 → 인덱스 범위로 페이지네이션.
 *
 *  일일 호출 한도(기본 1000): 쿼터 가드 + 배치 upsert. 소진 시 중단하고 다음 날 이어서.
 *  로컬 적재 후 사용자 쿼리는 Redis/PostgreSQL로 처리 → 외부 API 우회(zero-latency).
 *
 *  대상 데이터셋(사용자 발급 키):
 *   1) 식품영양성분DB정보            (서비스ID 기본 I2790) → FoodNutrition
 *   2) 건강기능식품 품목제조신고(원재료) (서비스ID 기본 C003)  → HealthFunctionalItem
 */
@Injectable()
export class MfdsSyncService {
  private readonly logger = new Logger(MfdsSyncService.name);
  private readonly baseUrl: string;
  private readonly foodKey: string;
  private readonly hfiKey: string;
  private readonly foodServiceId: string;
  private readonly hfiServiceId: string;
  private readonly pageSize: number; // 한 요청당 행 수(최대 1000)
  private readonly dailyQuota: number;
  // 식품영양성분 공급원: 'foodsafetykorea'(hex키) | 'datagokr'(apis.data.go.kr + 긴 인증키)
  private readonly foodProvider: 'foodsafetykorea' | 'datagokr';
  private readonly foodDgkUrl: string;
  private readonly foodDgkKey: string;
  private callsToday = 0;
  private quotaDate = '';

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FoodNutrition)
    private readonly foodRepo: Repository<FoodNutrition>,
    @InjectRepository(HealthFunctionalItem)
    private readonly hfiRepo: Repository<HealthFunctionalItem>,
  ) {
    const fallbackKey = config.get<string>('MFDS_API_KEY') ?? '';
    this.baseUrl = (config.get<string>('MFDS_BASE_URL') ?? 'http://openapi.foodsafetykorea.go.kr').replace(/\/$/, '');
    this.foodKey = config.get<string>('MFDS_FOOD_API_KEY') || fallbackKey;
    this.hfiKey = config.get<string>('MFDS_HFI_API_KEY') || fallbackKey;
    this.foodServiceId = config.get<string>('MFDS_FOOD_SERVICE_ID') ?? 'I2790';
    this.hfiServiceId = config.get<string>('MFDS_HFI_SERVICE_ID') ?? 'C003';
    this.pageSize = Math.min(1000, parseInt(config.get('MFDS_PAGE_SIZE') ?? '1000', 10));
    this.dailyQuota = parseInt(config.get('MFDS_DAILY_QUOTA') ?? '1000', 10);
    // 식품영양성분DB정보는 data.go.kr(15127578) REST → 기본 'datagokr'.
    this.foodProvider = (config.get<string>('MFDS_FOOD_PROVIDER') ?? 'datagokr') as 'foodsafetykorea' | 'datagokr';
    this.foodDgkUrl =
      config.get<string>('MFDS_FOOD_DATAGOKR_URL') ??
      'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02';
    this.foodDgkKey = config.get<string>('MFDS_FOOD_DATAGOKR_KEY') || '';
  }

  /** 일자 경계에서 카운터 리셋 후 쿼터 1건 차감 가능 여부 */
  private consumeQuota(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.quotaDate) {
      this.quotaDate = today;
      this.callsToday = 0;
    }
    if (this.callsToday >= this.dailyQuota) return false;
    this.callsToday += 1;
    return true;
  }

  /** 야간 동기화 — cron 식은 .env(MFDS_SYNC_CRON), 기본 03:10 KST */
  @Cron(process.env.MFDS_SYNC_CRON ?? '10 3 * * *', { timeZone: 'Asia/Seoul' })
  async nightlySync() {
    this.logger.log('MFDS 야간 동기화 시작');
    let food = 0;
    let hfi = 0;
    const foodKeyPresent = this.foodProvider === 'datagokr' ? !!this.foodDgkKey : !!this.foodKey;
    if (foodKeyPresent) food = await this.syncFoodNutrition();
    else this.logger.warn(`식품영양성분 키 미설정(provider=${this.foodProvider}) — 건너뜀`);
    if (this.hfiKey) hfi = await this.syncHealthFunctional();
    else this.logger.warn('건강기능식품 키(MFDS_HFI_API_KEY) 미설정 — 건너뜀');
    this.logger.log(`동기화 완료 — 식품 ${food}건, 건기식 ${hfi}건 (호출 ${this.callsToday}/${this.dailyQuota})`);
  }

  /**
   * 공통 GET — 식품안전나라 봉투 파싱 + RESULT.CODE 검증.
   * URL: {base}/api/{key}/{serviceId}/json/{start}/{end}
   */
  private async fetchPage(
    key: string,
    serviceId: string,
    startIdx: number,
    endIdx: number,
  ): Promise<{ items: any[]; totalCount: number }> {
    const url = `${this.baseUrl}/api/${key}/${serviceId}/json/${startIdx}/${endIdx}`;
    const { data } = await axios.get(url, {
      timeout: 15000,
      transformResponse: [(raw) => { try { return JSON.parse(raw); } catch { return raw; } }],
    });
    if (typeof data === 'string') {
      throw new Error(`MFDS 비정상 응답(JSON 아님): ${String(data).slice(0, 120)}`);
    }
    // 응답은 서비스ID로 키잉됨. 인증키 오류 등은 최상위 RESULT로 오기도 함.
    const node = data[serviceId] ?? data;
    const code: string | undefined = node?.RESULT?.CODE ?? data?.RESULT?.CODE;
    if (code && code !== 'INFO-000') {
      if (code === 'INFO-200') return { items: [], totalCount: 0 }; // 더 이상 데이터 없음
      throw new Error(`MFDS ${code} ${node?.RESULT?.MSG ?? data?.RESULT?.MSG ?? ''}`.trim());
    }
    const rows = node?.row ?? [];
    const items = Array.isArray(rows) ? rows : rows ? [rows] : [];
    const totalCount = Number(node?.total_count ?? items.length);
    return { items, totalCount };
  }

  /** 식품영양성분 — 공급원(provider)에 따라 분기 */
  async syncFoodNutrition(): Promise<number> {
    return this.foodProvider === 'datagokr'
      ? this.syncFoodDataGoKr()
      : this.syncFoodSafetyKorea();
  }

  /** [식품안전나라] total_count 기반 인덱스 페이지네이션 */
  private async syncFoodSafetyKorea(): Promise<number> {
    let start = 1;
    let upserted = 0;
    let total = Infinity;
    while (start <= total) {
      if (!this.consumeQuota()) {
        this.logger.warn('일일 쿼터 소진 — 식품 동기화 중단');
        break;
      }
      const end = start + this.pageSize - 1;
      let res: { items: any[]; totalCount: number };
      try {
        res = await this.fetchPage(this.foodKey, this.foodServiceId, start, end);
      } catch (e) {
        this.logger.error(`식품 ${start}~${end} 실패: ${(e as Error).message}`);
        break;
      }
      total = res.totalCount || 0;
      if (!res.items.length) break;
      await this.upsertFood(res.items.map((it) => this.mapFood(it)));
      upserted += res.items.length;
      start += this.pageSize;
    }
    return upserted;
  }

  /** [data.go.kr] apis.data.go.kr — serviceKey + pageNo/numOfRows, header/body 봉투 */
  private async syncFoodDataGoKr(): Promise<number> {
    const size = Math.min(100, this.pageSize); // data.go.kr 식약처 API는 통상 numOfRows≤100
    let pageNo = 1;
    let upserted = 0;
    let total = Infinity;
    while ((pageNo - 1) * size < total) {
      if (!this.consumeQuota()) {
        this.logger.warn('일일 쿼터 소진 — 식품(data.go.kr) 동기화 중단');
        break;
      }
      let res: { items: any[]; totalCount: number };
      try {
        res = await this.fetchDataGoKr(pageNo, size);
      } catch (e) {
        this.logger.error(`식품(data.go.kr) page ${pageNo} 실패: ${(e as Error).message}`);
        break;
      }
      total = res.totalCount || 0;
      if (!res.items.length) break;
      await this.upsertFood(res.items.map((it) => this.mapFood(it)));
      upserted += res.items.length;
      pageNo += 1;
    }
    return upserted;
  }

  /** data.go.kr 표준 봉투 파싱 — response.body 또는 최상위 body 모두 흡수 */
  private async fetchDataGoKr(pageNo: number, numOfRows: number): Promise<{ items: any[]; totalCount: number }> {
    const { data } = await axios.get(this.foodDgkUrl, {
      // serviceKey는 'Decoding(일반 인증키)'를 넣고 axios가 인코딩하도록 둔다(이중 인코딩 방지).
      params: { serviceKey: this.foodDgkKey, type: 'json', pageNo, numOfRows },
      timeout: 15000,
      transformResponse: [(raw) => { try { return JSON.parse(raw); } catch { return raw; } }],
    });
    if (typeof data === 'string') {
      throw new Error(`data.go.kr 비정상 응답(JSON 아님): ${String(data).slice(0, 140)}`);
    }
    const header = data?.response?.header ?? data?.header;
    const code = header?.resultCode;
    if (code && code !== '00' && code !== '0') {
      throw new Error(`data.go.kr resultCode=${code} ${header?.resultMsg ?? ''}`.trim());
    }
    const body = data?.response?.body ?? data?.body ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : body.items?.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const totalCount = Number(body.totalCount ?? items.length);
    return { items, totalCount };
  }

  async syncHealthFunctional(): Promise<number> {
    let start = 1;
    let upserted = 0;
    let total = Infinity;
    while (start <= total) {
      if (!this.consumeQuota()) {
        this.logger.warn('일일 쿼터 소진 — 건기식 동기화 중단');
        break;
      }
      const end = start + this.pageSize - 1;
      let res: { items: any[]; totalCount: number };
      try {
        res = await this.fetchPage(this.hfiKey, this.hfiServiceId, start, end);
      } catch (e) {
        this.logger.error(`건기식 ${start}~${end} 실패: ${(e as Error).message}`);
        break;
      }
      total = res.totalCount || 0;
      if (!res.items.length) break;
      await this.upsertHfi(res.items.map((it) => this.mapHfi(it)));
      upserted += res.items.length;
      start += this.pageSize;
    }
    return upserted;
  }

  /**
   * 식품영양성분(I2790) 원본 → FoodNutrition.
   * I2790 영양 필드는 NUTR_CONT1~9 (1 열량 / 2 탄수 / 3 단백 / 4 지방 / 5 당류 / 6 나트륨 ...).
   * 신/구·타 서비스 필드명도 방어적으로 흡수.
   */
  private mapFood(it: any): Partial<FoodNutrition> {
    const num = (...vs: any[]) => {
      for (const v of vs) if (v != null && v !== '' && !isNaN(Number(v))) return Number(v);
      return undefined;
    };
    const nutrients = {
      energyKcal: num(it.NUTR_CONT1, it.AMT_NUM1, it.enerc),
      carbohydrateG: num(it.NUTR_CONT2, it.AMT_NUM6, it.chocdf),
      proteinG: num(it.NUTR_CONT3, it.AMT_NUM3, it.prot),
      fatG: num(it.NUTR_CONT4, it.AMT_NUM4, it.fatce),
      sugarsG: num(it.NUTR_CONT5, it.AMT_NUM7, it.sugar),
      sodiumMg: num(it.NUTR_CONT6, it.AMT_NUM13, it.nat),
      cholesterolMg: num(it.NUTR_CONT7, it.AMT_NUM23),
      saturatedFatG: num(it.NUTR_CONT8, it.AMT_NUM24),
      transFatG: num(it.NUTR_CONT9, it.AMT_NUM25),
    };
    // FoodNtrCpntDbInfo02 실응답 키: FOOD_CD(대시형)/FOOD_NM_KR/FOOD_CAT1_NM/AMT_NUM*/SERVING_SIZE('100g')
    const code = String(it.FOOD_CD ?? it.foodCd ?? it.SAMPLE_ID ?? '').trim();
    const name = it.FOOD_NM_KR ?? it.foodNm ?? it.DESC_KOR ?? it.foodNmKr ?? '(미상)';
    const category = it.FOOD_CAT1_NM ?? it.foodLv3Nm ?? it.foodCat ?? it.GROUP_NAME ?? null;
    const serv = parseFloat(it.SERVING_SIZE ?? it.foodSize ?? it.servSize ?? ''); // '100g' → 100
    return {
      foodCode: code, // 가공/절단 없이 그대로(자연키)
      name,
      category,
      maker: it.MAKER_NM ?? it.mfrNm ?? it.imptCmpnyNm ?? it.MAKER_NAME ?? null,
      servingSizeG: Number.isFinite(serv) ? serv : null,
      nutrients,
      ohaengTags: inferOhaengTags(name, category),
      sodiumMg: nutrients.sodiumMg ?? null,
      sugarsG: nutrients.sugarsG ?? null,
      energyKcal: nutrients.energyKcal ?? null,
      proteinG: nutrients.proteinG ?? null,
    };
  }

  /** 건강기능식품 품목제조신고(C003, 원재료 포함) 원본 → HealthFunctionalItem */
  private mapHfi(it: any): Partial<HealthFunctionalItem> {
    const arr = (v: any) =>
      Array.isArray(v)
        ? v
        : typeof v === 'string'
          ? v.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean)
          : [];
    const name = it.PRDLST_NM ?? it.itemName ?? '(미상)';
    const rawMaterials = arr(it.RAWMTRL_NM ?? it.RAWMTRL ?? it.rawMaterial);
    return {
      licenseNo: String(it.PRDLST_REPORT_NO ?? it.STTEMNT_NO ?? it.licenseNo ?? '').trim(),
      name,
      maker: it.BSSH_NM ?? it.makerName ?? null,
      approvedClaims: arr(it.PRIMARY_FNCLTY ?? it.FNCLTY_CN ?? it.functionality),
      rawMaterials,
      intakeGuide: it.NTK_MTHD ?? it.intakeHint ?? null,
      cautions: it.IFTKN_ATNT_MATR_CN ?? it.caution ?? null,
      ohaengTags: inferOhaengTags(name, rawMaterials.join(' ')),
    };
  }

  /** 배치 upsert — 자연키 충돌 시 갱신 */
  private async upsertFood(rows: Partial<FoodNutrition>[]) {
    const valid = rows.filter((r) => r.foodCode && r.foodCode.length >= 4);
    if (valid.length) await this.foodRepo.upsert(valid as FoodNutrition[], ['foodCode']);
  }

  private async upsertHfi(rows: Partial<HealthFunctionalItem>[]) {
    const valid = rows.filter((r) => r.licenseNo);
    if (valid.length) await this.hfiRepo.upsert(valid as HealthFunctionalItem[], ['licenseNo']);
  }
}
