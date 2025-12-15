from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    api_encoding_key: str = Field("", env="API_ENCODING_KEY")
    api_kac_base_url: str = Field("https://openapi.airport.co.kr/service/rest/StatusOfFlights", env="API_KAC_BASE_URL")
    api_molit_base_url: str = Field("https://apis.data.go.kr/1613000/DmstcFlightNvgInfoService", env="API_MOLIT_BASE_URL")
    api_icn_passenger_base_url: str = Field("https://apis.data.go.kr/B551177/passgrAnncmt", env="API_ICN_PASSENGER_BASE_URL")
    api_icn_arrival_base_url: str = Field("https://apis.data.go.kr/B551177/StatusOfArrivals", env="API_ICN_ARRIVAL_BASE_URL")
    data_root: str = Field("data", env="DATA_ROOT")
    model_dir: str = Field("ml/artifacts/models", env="MODEL_DIR")
    metrics_path: str = Field("ml/artifacts/reports/metrics.json", env="METRICS_PATH")
    train_table_path: str = Field("data/processed/train_table.parquet", env="TRAIN_TABLE_PATH")
    default_model_name: str = Field("lightgbm", env="MODEL_NAME")
    log_level: str = Field("INFO", env="LOG_LEVEL")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
