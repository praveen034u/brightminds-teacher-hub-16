const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
}

export async function callEdgeFunction(
  functionName: string,
  auth0UserId: string,
  options: EdgeFunctionOptions = {}
) {
  const { method = 'GET', body, params = {} } = options;

  // Add auth0_user_id to params
  const urlParams = new URLSearchParams({
    auth0_user_id: auth0UserId,
    ...params,
  });

  const url = `${SUPABASE_URL}/functions/v1/${functionName}?${urlParams}`;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Convenience functions for each edge function
export const meAPI = {
  get: (auth0UserId: string) => callEdgeFunction('me', auth0UserId),
  update: (auth0UserId: string, data: any) =>
    callEdgeFunction('me', auth0UserId, { method: 'PUT', body: data }),
};

export const studentsAPI = {
  list: (auth0UserId: string) => callEdgeFunction('students', auth0UserId),
  create: (auth0UserId: string, data: any) =>
    callEdgeFunction('students', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string, id: string, data: any) =>
    callEdgeFunction('students', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string, id: string) =>
    callEdgeFunction('students', auth0UserId, { method: 'DELETE', params: { id } }),
  bulkUpload: (auth0UserId: string, students: any[]) =>
    callEdgeFunction('students', auth0UserId, {
      method: 'POST',
      params: { action: 'bulk-csv' },
      body: { students },
    }),
};

export const roomsAPI = {
  list: (auth0UserId: string) => callEdgeFunction('rooms', auth0UserId),
  create: (auth0UserId: string, data: any) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string, id: string, data: any) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string, id: string) =>
    callEdgeFunction('rooms', auth0UserId, { method: 'DELETE', params: { id } }),
  assignStudents: (auth0UserId: string, roomId: string, studentIds: string[]) =>
    callEdgeFunction('rooms', auth0UserId, {
      method: 'POST',
      params: { action: 'assign-students' },
      body: { roomId, studentIds },
    }),
};

export const assignmentsAPI = {
  list: (auth0UserId: string, roomId?: string) =>
    callEdgeFunction('assignments', auth0UserId, { params: roomId ? { roomId } : {} }),
  create: (auth0UserId: string, data: any) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string, id: string, data: any) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'PUT', params: { id }, body: data }),
  delete: (auth0UserId: string, id: string) =>
    callEdgeFunction('assignments', auth0UserId, { method: 'DELETE', params: { id } }),
};

export const helpRequestsAPI = {
  list: (auth0UserId: string) => callEdgeFunction('help-requests', auth0UserId),
  create: (auth0UserId: string, data: any) =>
    callEdgeFunction('help-requests', auth0UserId, { method: 'POST', body: data }),
  update: (auth0UserId: string, id: string, data: any) =>
    callEdgeFunction('help-requests', auth0UserId, { method: 'PUT', params: { id }, body: data }),
};
