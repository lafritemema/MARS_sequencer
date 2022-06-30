export interface AssetReportBody {
  status: 'SUCCESS'|'ERROR'
}

export interface AssetReportSuccessBody extends AssetReportBody {
  data?:object
}

export interface AssetReportErrorBody extends AssetReportBody {
  error:object
}
