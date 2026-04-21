import request from '../utils/requestUtil';

export const dataAPI = {
  async getPatients(params = {}) {
    const res = await request.get('/data/patients', { params });
    return res;
  },

  async getPatientDetail(id) {
    const res = await request.get(`/data/patients/${id}`);
    return res;
  },

  async getDoctors(params = {}) {
    const res = await request.get('/data/doctors', { params });
    return res;
  },

  async getDoctorDetail(id) {
    const res = await request.get(`/data/doctors/${id}`);
    return res;
  },

  async getDiagnoses(params = {}) {
    const res = await request.get('/data/diagnoses', { params });
    return res;
  },

  async getMedicines(params = {}) {
    const res = await request.get('/data/medicines', { params });
    return res;
  },

  async getEvaluations(params = {}) {
    const res = await request.get('/data/evaluations', { params });
    return res;
  },

  async trendAnalysis(data) {
    const res = await request.post('/analysis/trend', data);
    return res;
  },

  async correlationAnalysis(data) {
    const res = await request.post('/analysis/correlation', data);
    return res;
  },

  async predictionAnalysis(data) {
    const res = await request.post('/analysis/prediction', data);
    return res;
  },

  async comparisonAnalysis(data) {
    const res = await request.post('/analysis/comparison', data);
    return res;
  },

  async getDashboardStats() {
    const res = await request.get('/analysis/overview');
    return res;
  },

  async getDashboardChartData(chartType, params = {}) {
    const response = await request.get(`/analysis/dashboard-chart-data/${chartType}`, { params })
    return response
  },

  async getOverview(params = {}) {
    const res = await request.get('/analysis/overview', { params });
    return res;
  },

  async getHospitalRanking(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/hospital_ranking', { params });
    return res;
  },

  async getDoctorRanking(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/doctor_ranking', { params });
    return res;
  },

  async getDiseaseAnalysis(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/disease', { params });
    return res;
  },

  async getRegionMedicalResource(params = {}) {
    const res = await request.get('/analysis/region-medical-resource', { params });
    return res;
  },

  async getDepartmentServiceAnalysis(params = {}) {
    const res = await request.get('/analysis/department-service-analysis', { params });
    return res;
  },

  async getHospitalLevelAnalysis(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/hospital_level', { params });
    return res;
  },

  async getDepartmentService(params = {}) {
    return this.getDepartmentServiceAnalysis(params);
  },

  async getConsultationTrend(params = {}) {
    const finalParams = {
      limit: 120,
      ...params
    };
    try {
      // 优先使用支持 day/week/month/quarter 分区聚合的专用接口
      const res = await request.get('/analysis/consultation-trend', {
        params: finalParams,
        timeout: 8000
      });
      if (res?.success) {
        return res;
      }
      // 业务失败也回退，避免前端直接空图
      const fallback = await request.get('/analysis/dashboard-chart-data/consultation_trend', {
        params: finalParams,
        timeout: 8000
      });
      return fallback;
    } catch (error) {
      // 兼容旧接口，避免后端路由差异导致前端不可用
      try {
        const res = await request.get('/analysis/dashboard-chart-data/consultation_trend', {
          params: finalParams,
          timeout: 8000
        });
        return res;
      } catch (fallbackError) {
        // 双接口都超时/失败时，返回可渲染的空数据，避免页面一直 pending
        return {
          success: true,
          code: 200,
          message: '趋势接口暂不可用，已回退为空数据',
          data: { list: [], total: 0 }
        };
      }
    }
  },

  async triggerETL(params = {}) {
    const res = await request.post('/analysis/trigger-etl', params);
    return res;
  },

  async getDoctorTitleAnalysis(params = {}) {
    const res = await request.get('/analysis/doctor-title-analysis', { params });
    return res;
  },

  async getDoctorListByTitle(params = {}) {
    const res = await request.get('/analysis/doctor-list-by-title', { params });
    return res;
  },

  async getPriceRangeAnalysis(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/disease', { params });
    return res;
  },

  async getSatisfactionAnalysis(params = {}) {
    const res = await request.get('/analysis/satisfaction-analysis', { params });
    return res;
  },

  async getDepartmentSatisfactionAnalysis(params = {}) {
    const res = await request.get('/analysis/department-satisfaction-analysis', { params });
    return res;
  },

  async getCityMedicalComparison(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/region_distribution', { params });
    return res;
  },

  async getCityDetail(params = {}) {
    const res = await request.get('/analysis/dashboard-chart-data/region_distribution', { params });
    return res;
  },

  async getRealtimeData() {
    const res = await request.get('/dashboard/realtime');
    return res;
  },

  async exportData(params) {
    const res = await request.post('/data/export', params, {
      responseType: 'blob',
      timeout: 60000
    });
    return res;
  },

  async importData(formData) {
    const res = await request.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });
    return res;
  },

  async getDataQualityReport() {
    const res = await request.get('/data/quality/report');
    return res;
  },

  async runDataCleaning(params) {
    const res = await request.post('/data/cleaning/run', params);
    return res;
  },

  async getHomeStats() {
    const res = await request.get('/home/stats');
    return res;
  },

  async getRecentRecords(limit = 5) {
    const res = await request.get('/home/recent', { params: { limit } });
    return res;
  },

  async getSystemNotices(limit = 5) {
    const res = await request.get('/home/notices', { params: { limit } });
    return res;
  },

  async getHomeChartData(type) {
    const res = await request.get(`/home/charts/${type}`);
    return res;
  },

  async getCollectionStatistics() {
    const res = await request.get('/collection/statistics');
    return res;
  },

  async getActiveUsers() {
    const res = await request.get('/analysis/active-users');
    return res;
  }
};

export default dataAPI;
