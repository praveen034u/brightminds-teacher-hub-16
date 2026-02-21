import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';

const SUPABASE_URL = getSupabaseUrl();

interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
  accessToken?: string;
}

export async function callEdgeFunction(
  functionName: string,
  auth0UserId: string | null,
  options: EdgeFunctionOptions = {}
) {
  if (!auth0UserId) {
    throw new Error('Not authenticated');
  }

  const { method = 'GET', body, params = {}, accessToken } = options;

  // Add auth0_user_id to params
  const urlParams = new URLSearchParams({
    auth0_user_id: auth0UserId,
    ...params,
  });

  const url = `${SUPABASE_URL}/functions/v1/${functionName}?${urlParams}`;

  const apiKey = getSupabasePublishableKey();
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
  };

  if (accessToken) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  console.log(`🔗 Calling ${functionName}:`, url);

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${functionName} error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || `Request failed with status ${response.status}`);
      } catch {
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log(`✅ ${functionName} success:`, result);
    return result;
    
  } catch (error) {
    console.error(`💥 ${functionName} fetch error:`, error);
    throw error;
  }
}

// Convenience functions for each edge function
export const meAPI = {
  get: (auth0UserId: string | null) => callEdgeFunction('me', auth0UserId),
  update: (auth0UserId: string | null, data: any) =>
    callEdgeFunction('me', auth0UserId, { method: 'PUT', body: data }),
};

export const studentsAPI = {
  list: (auth0UserId: string | null) => callEdgeFunction('students', auth0UserId),
  listPaged: (
    auth0UserId: string | null,
    options: { page: number; pageSize: number; grade?: string; search?: string }
  ) =>
    callEdgeFunction('students', auth0UserId, {
      params: {
        includeMeta: 'true',
        page: String(options.page),
        pageSize: String(options.pageSize),
        ...(options.grade ? { grade: options.grade } : {}),
        ...(options.search ? { search: options.search } : {}),
      },
    }),
  create: (auth0UserId: string | null, data: any) =>
    callEdgeFunction('students', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string | null, id: string, data: any) =>
    callEdgeFunction('students', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string | null, id: string) =>
    callEdgeFunction('students', auth0UserId, { method: 'DELETE', params: { id } }),
  bulkUpload: (auth0UserId: string | null, students: any[]) =>
    callEdgeFunction('students', auth0UserId, {
      method: 'POST',
      params: { action: 'bulk-csv' },
      body: { students },
    }),
};

export const roomsAPI = {
  list: (auth0UserId: string | null) => callEdgeFunction('rooms', auth0UserId),
  create: (auth0UserId: string | null, data: any) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string | null, id: string, data: any) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string | null, id: string) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'DELETE', params: { id } }),
  assignStudents: (auth0UserId: string | null, roomId: string, studentIds: string[]) =>
    callEdgeFunction('rooms', auth0UserId, {
      method: 'POST',
      params: { action: 'assign-students' },
      body: { roomId, studentIds },
    }),
  removeStudent: (auth0UserId: string | null, roomId: string, studentId: string) =>
    callEdgeFunction('rooms', auth0UserId, {
      method: 'DELETE',
      params: { id: roomId, student_id: studentId },
    }),
};

export const assignmentsAPI = {
  list: (auth0UserId: string | null, roomId?: string) =>
    callEdgeFunction('assignments', auth0UserId, { params: roomId ? { roomId } : {} }),
  create: (auth0UserId: string | null, data: any) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string | null, id: string, data: any) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string | null, id: string) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'DELETE', params: { id } }),
};

export const helpRequestsAPI = {
  list: (auth0UserId: string | null) => callEdgeFunction('help-requests', auth0UserId),
  create: (auth0UserId: string | null, data: any) =>
    callEdgeFunction('help-requests', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string | null, id: string, data: any) =>
    callEdgeFunction('help-requests', auth0UserId, { method: 'PUT', params: { id }, body: data }),
};

export const teacherProgressAPI = {
  getOverview: (auth0UserId: string | null) => callEdgeFunction('teacher-progress', auth0UserId),
  getAssignmentProgress: (auth0UserId: string | null, assignmentId: string) =>
    callEdgeFunction('teacher-progress', auth0UserId, { params: { assignment_id: assignmentId } }),
};

export const adminSettingsAPI = {
  getOpenAiKey: (auth0UserId: string | null) => callEdgeFunction('admin-settings', auth0UserId),
  setOpenAiKey: (auth0UserId: string | null, apiKey: string) =>
    callEdgeFunction('admin-settings', auth0UserId, { method: 'PUT', body: { key: apiKey } }),
};
