/**
 * 用户权限转移组合式函数
 */
import { ref, computed } from 'vue';
import { userAPI } from '../../../api/users';
import { message } from 'ant-design-vue';

export function useUserTransfer() {
  const loading = ref(false);
  const saving = ref(false);
  const normalUsers = ref([]);
  const adminUsers = ref([]);
  const selectedLeft = ref([]);
  const selectedRight = ref([]);
  const leftKeyword = ref('');
  const rightKeyword = ref('');

  const stats = computed(() => ({
    total: normalUsers.value.length + adminUsers.value.length,
    normal: normalUsers.value.length,
    admin: adminUsers.value.length
  }));

  const filteredLeftUsers = computed(() => {
    if (!leftKeyword.value) return normalUsers.value;
    const kw = leftKeyword.value.toLowerCase();
    return normalUsers.value.filter(
      u => u.username?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
    );
  });

  const filteredRightUsers = computed(() => {
    if (!rightKeyword.value) return adminUsers.value;
    const kw = rightKeyword.value.toLowerCase();
    return adminUsers.value.filter(
      u => u.username?.toLowerCase().includes(kw) || u.email?.toLowerCase().includes(kw)
    );
  });

  const hasSelection = computed(() => selectedLeft.value.length > 0 || selectedRight.value.length > 0);

  async function fetchUsers() {
    loading.value = true;
    try {
      const res = await userAPI.get_user_list({ page: 1, page_size: 1000 });
      if (res?.success && res?.code === 200 && res?.data?.user_list) {
        const users = res.data.user_list;
        normalUsers.value = users.filter(u => !u.is_staff && !u.is_superuser);
        adminUsers.value = users.filter(u => u.is_staff || u.is_superuser);
        
        // 系统管理员不能被选中，移除已选择的系统管理员
        selectedLeft.value = selectedLeft.value.filter(id => {
          const user = users.find(u => u.id === id);
          return user && !user.is_superuser;
        });
        
        selectedRight.value = selectedRight.value.filter(id => {
          const user = users.find(u => u.id === id);
          return user && !user.is_superuser;
        });
      } else {
        console.warn('API返回格式异常:', res);
        normalUsers.value = [];
        adminUsers.value = [];
        message.warning(res?.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      normalUsers.value = [];
      adminUsers.value = [];
      message.error('获取用户列表失败');
    } finally {
      loading.value = false;
    }
  }

  async function moveToAdmin() {
    if (selectedLeft.value.length === 0) {
      message.warning('请先选择要升级的用户');
      return;
    }
    saving.value = true;
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const id of selectedLeft.value) {
        try {
          const res = await userAPI.update_user_permissions(id, {
            role: 'admin',
            permissions: []
          });
          
          if (res?.success && res?.code === 200) {
            successCount++;
          } else {
            failCount++;
            console.warn(`升级用户 ${id} 失败:`, res);
          }
        } catch (err) {
          failCount++;
          console.error(`升级用户 ${id} 异常:`, err);
        }
      }
      
      if (successCount > 0) {
        message.success(`成功升级 ${successCount} 个用户`);
      }
      if (failCount > 0) {
        message.warning(`${failCount} 个用户升级失败`);
      }
      
      selectedLeft.value = [];
      await fetchUsers();
    } catch (error) {
      console.error('移动用户失败:', error);
      message.error('移动用户失败');
    } finally {
      saving.value = false;
    }
  }

  async function moveToUser() {
    if (selectedRight.value.length === 0) {
      message.warning('请先选择要降级的用户');
      return;
    }
    saving.value = true;
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const id of selectedRight.value) {
        try {
          const res = await userAPI.update_user_permissions(id, {
            role: 'user',
            permissions: []
          });
          
          if (res?.success && res?.code === 200) {
            successCount++;
          } else {
            failCount++;
            console.warn(`降级用户 ${id} 失败:`, res);
          }
        } catch (err) {
          failCount++;
          console.error(`降级用户 ${id} 异常:`, err);
        }
      }
      
      if (successCount > 0) {
        message.success(`成功降级 ${successCount} 个用户`);
      }
      if (failCount > 0) {
        message.warning(`${failCount} 个用户降级失败`);
      }
      
      selectedRight.value = [];
      await fetchUsers();
    } catch (error) {
      console.error('移动用户失败:', error);
      message.error('移动用户失败');
    } finally {
      saving.value = false;
    }
  }

  function selectAll(side) {
    if (side === 'left') {
      // 系统管理员不能被选中
      selectedLeft.value = filteredLeftUsers.value.filter(u => !u.is_superuser).map(u => u.id);
    } else {
      // 系统管理员不能被选中
      selectedRight.value = filteredRightUsers.value.filter(u => !u.is_superuser).map(u => u.id);
    }
  }

  function invertSelection(side) {
    if (side === 'left') {
      const currentIds = filteredLeftUsers.value.filter(u => !u.is_superuser).map(u => u.id);
      selectedLeft.value = currentIds.filter(id => !selectedLeft.value.includes(id));
    } else {
      const currentIds = filteredRightUsers.value.filter(u => !u.is_superuser).map(u => u.id);
      selectedRight.value = currentIds.filter(id => !selectedRight.value.includes(id));
    }
  }

  function clearSelection() {
    selectedLeft.value = [];
    selectedRight.value = [];
  }

  async function saveChanges() {
    saving.value = true;
    try {
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    loading,
    saving,
    normalUsers,
    adminUsers,
    selectedLeft,
    selectedRight,
    leftKeyword,
    rightKeyword,
    stats,
    filteredLeftUsers,
    filteredRightUsers,
    hasSelection,
    moveToAdmin,
    moveToUser,
    selectAll,
    invertSelection,
    clearSelection,
    saveChanges,
    fetchUsers
  };
}