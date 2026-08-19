import { DataProvider } from "@refinedev/core";
import { UserAppliance, UserCalendarEvent } from "../types";

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(`powerforecast_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`powerforecast_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// Clean slate: ensure no mock data is seeded
if (!localStorage.getItem("powerforecast_clean_slate_v1")) {
  localStorage.removeItem("powerforecast_user_appliances");
  localStorage.removeItem("powerforecast_user_calendar_events");
  localStorage.removeItem("powerforecast_appliance_usage_logs");
  localStorage.setItem("powerforecast_clean_slate_v1", "true");
  setStorage("user_appliances", []);
  setStorage("user_calendar_events", []);
}

export const localDataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }: any) => {
    let data = getStorage<any[]>(resource, []);

    if (filters) {
      filters.forEach((f: any) => {
        if (f.field && f.value !== undefined && f.value !== "all") {
          data = data.filter((item) => {
            const itemVal = String(item[f.field] || "").toLowerCase();
            const filterVal = String(f.value).toLowerCase();
            return itemVal.includes(filterVal);
          });
        }
      });
    }

    if (sorters && sorters.length > 0) {
      const sorter = sorters[0];
      data.sort((a, b) => {
        if (sorter.order === "asc") {
          return a[sorter.field] > b[sorter.field] ? 1 : -1;
        }
        return a[sorter.field] < b[sorter.field] ? 1 : -1;
      });
    }

    const current = pagination?.current || 1;
    const pageSize = pagination?.pageSize || 100;
    const start = (current - 1) * pageSize;
    const paginated = data.slice(start, start + pageSize);

    return {
      data: paginated,
      total: data.length,
    };
  },

  getOne: async ({ resource, id }: any) => {
    const data = getStorage<any[]>(resource, []);
    const item = data.find((x) => String(x.id) === String(id));
    if (!item) throw new Error(`Resource ${resource} with id ${id} not found`);
    return { data: item };
  },

  create: async ({ resource, variables }: any) => {
    const data = getStorage<any[]>(resource, []);
    const newItem: any = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(variables as object),
    };
    data.unshift(newItem);
    setStorage(resource, data);
    return { data: newItem } as any;
  },

  update: async ({ resource, id, variables }: any) => {
    const data = getStorage<any[]>(resource, []);
    const index = data.findIndex((x) => String(x.id) === String(id));
    if (index === -1) throw new Error(`Resource ${resource} with id ${id} not found`);

    data[index] = {
      ...data[index],
      ...(variables as object),
      updated_at: new Date().toISOString(),
    };
    setStorage(resource, data);
    return { data: data[index] } as any;
  },

  deleteOne: async ({ resource, id }: any) => {
    let data = getStorage<any[]>(resource, []);
    const target = data.find((x) => String(x.id) === String(id));
    data = data.filter((x) => String(x.id) !== String(id));
    setStorage(resource, data);
    return { data: target } as any;
  },

  getApiUrl: () => "",
};
