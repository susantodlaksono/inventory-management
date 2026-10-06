"use client";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { filtersReset } from "@/features/products/filtersSlice";
import { filterDrawerClosed, selectIsFilterDrawerOpen } from "@/features/ui/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { CategorySelect, SortSelect } from "./FilterControls";

export function FilterDrawer({ resultCount }: { resultCount: number | undefined }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectIsFilterDrawerOpen);
  const close = () => dispatch(filterDrawerClosed());

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Filters"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => dispatch(filtersReset())}>
            Reset
          </Button>
          <Button className="flex-1" onClick={close}>
            {resultCount === undefined ? "Show results" : `Show ${resultCount} results`}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <CategorySelect showLabel />
        <SortSelect showLabel />
      </div>
    </Drawer>
  );
}
