import { createContext, useContext } from "react";

export type Language = "en" | "ko";

const translations = {
  en: {
    common: {
      language: "Language",
      loadingDashboard: "Loading dashboard...",
      errorDashboard: "Failed to load dashboard.",
      loadingDetail: "Loading airport detail...",
      errorDetail: "Failed to load airport detail.",
      predicting: "Running prediction...",
      routeComputing: "Computing itinerary...",
      predictionFailed: "Prediction failed.",
      routeFailed: "Could not compute route plan."
    },
    tabs: {
      control: "Control Tower",
      detail: "Gate Situation",
      lab: "Prediction Lab",
      route: "Route Advisor"
    },
    app: {
      chooseAirport: "Choose airport",
      opsDashboard: "OPS Dashboard"
    },
    hero: {
      tagline: "Airport Ops Command",
      title: "Delay intelligence for {airport}",
      description: "Live congestion telemetry + ML-based forecasts for your situation room."
    },
    dashboard: {
      overviewTitle: "Apron Overview",
      overviewDesc: "Aggregated metrics for {airport}",
      trendTitle: "Delay Trend (Last 14 days)",
      trendDesc: "ML baseline vs actual rates",
      hourlyTitle: "Hourly Hotspots",
      hourlyDesc: "Identify crew/bay pressure slots",
      statCards: {
        avgDelayRate: "Avg Delay Rate",
        avgFlightsSubtitle: "{count} flights",
        peakDelayHour: "Peak Delay Hour",
        throughput: "Runway Throughput",
        throughputValue: "74 ops/hr",
        throughputSubtitle: "Derived from historical operations"
      }
    },
    detail: {
      gateTitle: "Gate Snapshot",
      gateDesc: "Utilization estimates by terminal",
      hourlyTitle: "Hourly Breakdown",
      hourlyDesc: "Delay rate, flights, congestion ratio",
      timelineTitle: "Recent Delay Timeline",
      timelineDesc: "Full timeline from processed dataset",
      gateStatus: {
        high: "High load",
        stable: "Stable",
        elevated: "Elevated",
        available: "Available"
      },
      table: {
        hour: "Hour",
        delayRate: "Delay Rate",
        congestion: "Congestion",
        flights: "Flights",
        date: "Date"
      },
      utilizationLabel: "{value}% utilization"
    },
    prediction: {
      title: "Prediction Lab",
      description: "Pick a day, tweak parameters, and get ML-backed delay probability.",
      targetLabel: "Target Date",
      tips:
        "Tips: hour=local time, weekday=ISO (0=Mon), month=1-12. Congestion 1.0 equals historical average.",
      runButton: "Run Prediction",
      resetButton: "Reset",
      calendarTitle: "Delay Calendar",
      calendarToday: "Today",
      calendarHint: "Click any day to auto-fill weekday/month. Colors indicate recent delay intensity.",
      loaderLabel: "Predicting...",
      resultLikelyDelay: "Likely Delay",
      resultOnTime: "On-Time Window",
      resultNote: "Threshold {threshold} · adjust staffing when probability exceeds the threshold.",
      fields: {
        hour: "hour",
        weekday: "weekday",
        month: "month",
        congestion_ratio: "congestion ratio"
      }
    },
    predictionCalendar: {
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      noData: "Calendar unavailable",
      paxLabel: "Pax {count}",
      predictedPassengerLabel: "Pred Delay {count}"
    },
    route: {
      title: "Route Advisor",
      description:
        "Enter your commute time and buffer to get a recommended departure schedule that accounts for delay risk.",
      form: {
        date: "Flight date",
        hour: "Flight hour (local, 0-23)",
        travel: "Travel minutes (home → ICN)",
        buffer: "Check-in buffer (min)",
        congestion: "Congestion ratio (1.0 = average)"
      },
      button: "Calculate Route Plan",
      loader: "Computing itinerary...",
      resultTitle: "Recommended Times",
      leave: "Leave home",
      arrive: "Arrive airport",
      buffer: "Total buffer",
      footnote: "* Extra buffer automatically scales with predicted delay probability."
    },
    components: {
      gaugeLabel: "Delay probability"
    }
  },
  ko: {
    common: {
      language: "언어",
      loadingDashboard: "대시보드를 불러오는 중...",
      errorDashboard: "대시보드 데이터를 불러오지 못했습니다.",
      loadingDetail: "공항 상세 정보를 불러오는 중...",
      errorDetail: "공항 상세 데이터를 불러오지 못했습니다.",
      predicting: "예측 중...",
      routeComputing: "이동 경로를 계산하는 중...",
      predictionFailed: "예측을 실행하지 못했습니다.",
      routeFailed: "경로 계산에 실패했습니다."
    },
    tabs: {
      control: "관제 센터",
      detail: "게이트 현황",
      lab: "예측 실험실",
      route: "길찾기 어드바이저"
    },
    app: {
      chooseAirport: "공항 선택",
      opsDashboard: "운영 대시보드"
    },
    hero: {
      tagline: "인천공항 상황실",
      title: "{airport} 지연 인텔리전스",
      description: "혼잡 텔레메트리와 ML 기반 확률을 한 화면에서 제공합니다."
    },
    dashboard: {
      overviewTitle: "작전 구역 요약",
      overviewDesc: "{airport} 주요 지표",
      trendTitle: "지연 추세 (최근 14일)",
      trendDesc: "ML 기준선 vs 실측",
      hourlyTitle: "시간대별 혼잡 구간",
      hourlyDesc: "승무원/게이트 압력 구간 확인",
      statCards: {
        avgDelayRate: "평균 지연률",
        avgFlightsSubtitle: "{count}편 운항",
        peakDelayHour: "최대 지연 시간대",
        throughput: "활주로 처리량",
        throughputValue: "시간당 74회",
        throughputSubtitle: "과거 운항 이력 기반 추정"
      }
    },
    detail: {
      gateTitle: "게이트 스냅샷",
      gateDesc: "터미널별 활용률",
      hourlyTitle: "시간대별 상세",
      hourlyDesc: "지연률 / 운항편수 / 혼잡도",
      timelineTitle: "최근 지연 타임라인",
      timelineDesc: "전처리된 전체 타임라인",
      gateStatus: {
        high: "고부하",
        stable: "안정",
        elevated: "주의",
        available: "여유"
      },
      table: {
        hour: "시간",
        delayRate: "지연률",
        congestion: "혼잡도",
        flights: "운항편수",
        date: "일자"
      },
      utilizationLabel: "활용률 {value}%"
    },
    prediction: {
      title: "예측 실험실",
      description: "달력에서 날짜를 선택하고 입력값을 조정하여 지연 확률을 확인하세요.",
      targetLabel: "예측 대상 날짜",
      tips: "hour=현지시간, weekday=ISO(0=월), month=1-12, congestion 1.0=평균 혼잡.",
      runButton: "예측 실행",
      resetButton: "초기화",
      calendarTitle: "지연 달력",
      calendarToday: "오늘",
      calendarHint: "날짜를 누르면 자동으로 weekday/month가 채워집니다. 색상은 최근 지연 강도를 의미합니다.",
      loaderLabel: "예측 계산 중...",
      resultLikelyDelay: "지연 가능성 높음",
      resultOnTime: "정시 가능 구간",
      resultNote: "임계값 {threshold} · 확률이 임계값을 넘으면 인력/게이트를 조정하세요.",
      fields: {
        hour: "시간",
        weekday: "요일",
        month: "월",
        congestion_ratio: "혼잡 비율"
      }
    },
    predictionCalendar: {
      weekdays: ["일", "월", "화", "수", "목", "금", "토"],
      noData: "달력을 불러올 수 없습니다",
      paxLabel: "예상 탑승 {count}명",
      predictedPassengerLabel: "지연 영향 {count}명"
    },
    route: {
      title: "길찾기 어드바이저",
      description: "집 → 인천공항 이동 시간과 버퍼를 입력하면 지연 리스크를 반영한 출발 권장 시간을 제공합니다.",
      form: {
        date: "탑승 날짜",
        hour: "탑승 시간 (현지, 0-23)",
        travel: "이동 시간 (분)",
        buffer: "체크인 버퍼 (분)",
        congestion: "혼잡 비율 (1.0 = 평균)"
      },
      button: "경로 계산",
      loader: "경로 계산 중...",
      resultTitle: "권장 이동 시각",
      leave: "집에서 출발",
      arrive: "공항 도착",
      buffer: "총 버퍼",
      footnote: "* 예측된 지연 확률에 따라 버퍼가 자동으로 확대됩니다."
    },
    components: {
      gaugeLabel: "지연 확률"
    }
  }
} as const;

export const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
}>({
  lang: "en",
  setLang: () => {}
});

export const useLanguage = () => useContext(LanguageContext);

export const useTranslation = () => {
  const { lang } = useLanguage();
  return translations[lang];
};

export const useLanguageToggle = () => {
  const { lang, setLang } = useLanguage();
  return { lang, setLang };
};
