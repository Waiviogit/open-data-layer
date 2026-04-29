export type CategoryNavItem = {
  name: string;
  objects_count: number;
  has_children: boolean;
};

export type CategoryNavData = {
  items: CategoryNavItem[];
  uncategorized_count: number;
  show_other: boolean;
};
