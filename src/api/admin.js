import axios from 'axios'

const api = axios.create({
    baseURL : "http://127.0.0.1:8000/api",
    timeout : 5000,
    headers : {
        "Content-Type" : "application/json"
    }
})

// 统一注入认证令牌，避免 /analyse/recent-users 等受保护接口 401
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 字典分类接口
export const adminDictCategoryApi = {
    /**
     * 新增字典分类
     */
    async addDictCategory(data){
        const res = await api.post("/admin/dictcategory/" ,data)
        return res 
    },

    async getDictCategoryList(){
        const res = await api.get("/admin/dictcategory/")
        return res 
    },
    
    async deletedDictCategory(data ){
        console.log(data)
        const res = await api.delete("/admin/dictcategory/" + data +"/remove/"  )
        return res 
    }

}

// 字典接口
export const adminDictApi = {
    /**
     * 新增字典
     */
    async addDict(data){
        const res = await api.post("admin/adddict" ,data)
        return res 
    } , 

    /**
     * 获取字典列表
     * @returns 
     */
    async getDictList (data) {
        const res = await api.get("admin/dict/" , {
                params: data
            } 
        )
        return res 
    }
}
export const menuApi = {
    async getMenuList(data) {
        const res = await api.get("admin/menu_list/" , {})
        return res 
    }
}

export const analyseApi = {
    async getAdminHomeStats() {
        const res = await api.get("/admin/home-stats")
        return res.data
    },

    async getRecentUsers(days = 7, limit = 10) {
        const res = await api.get("/analyse/recent-users", {
            params: { days, limit }
        })
        return res.data
    },

    async getSystemLogs(limit = 20, level = null) {
        const params = { limit }
        if (level) params.level = level
        const res = await api.get("/admin/system-logs", { params })
        return res.data
    },

    async getUserActivity(period = "week", limit = 7) {
        const res = await api.get("/admin/user-activity", {
            params: { period, limit }
        })
        return res.data
    },

    async getResourceUsage() {
        const res = await api.get("/admin/resource-usage")
        return res.data
    }
}

export {
    api as axiosInstance
}