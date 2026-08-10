import { getActiveShift, getCategoriesWithProducts, sumSoldByProductId } from "@/lib/data";
import { formatTime12, formatDateDDMMYY } from "@/lib/dateFormat";
import { getCurrentUser } from "@/lib/session";
import ShiftControls from "@/components/ShiftControls";
import CategorySection from "@/components/CategorySection";
import TabSwitcher from "@/components/TabSwitcher";

export default async function DashboardPage() {
  const [categories, activeShift, currentUser] = await Promise.all([
    getCategoriesWithProducts(),
    getActiveShift(),
    getCurrentUser(),
  ]);

  // No active shift means no owner to enforce; otherwise only the person who
  // started it may sell, adjust stock, or edit prices — see shiftOwnershipError.
  const isShiftOwner = !activeShift || activeShift.startedByUserId === currentUser?.userId;

  const soldByProductId = activeShift ? sumSoldByProductId(activeShift.sales) : new Map<string, number>();

  const startedAtLabel = activeShift
    ? `${formatDateDDMMYY(activeShift.startedAt)} ${formatTime12(activeShift.startedAt)}`
    : null;

  const notes = (activeShift?.notes ?? []).map((note) => ({
    id: note.id,
    text: note.text,
    usernameSnapshot: note.usernameSnapshot,
    createdAtLabel: `${formatDateDDMMYY(note.createdAt)} ${formatTime12(note.createdAt)}`,
  }));

  return (
    <div>
      <ShiftControls
        hasActiveShift={!!activeShift}
        startedAtLabel={startedAtLabel}
        startedByUsername={activeShift?.startedByUser.username ?? null}
        isShiftOwner={isShiftOwner}
        notes={notes}
      />

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No categories yet. Head to Manage to add your first category and products.
        </p>
      ) : (
        <TabSwitcher
          tabs={categories.map((c) => ({ id: c.id, label: c.name.split("\n")[0] }))}
        >
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              categoryCashPriceCents={category.cashPriceCents}
              categoryCardPriceCents={category.cardPriceCents}
              categoryDealNote={category.dealNote}
              categoryDealQuantity={category.dealQuantity}
              categoryDealPriceCents={category.dealPriceCents}
              products={category.products}
              soldByProductId={soldByProductId}
              hasActiveShift={!!activeShift}
              isShiftOwner={isShiftOwner}
            />
          ))}
        </TabSwitcher>
      )}
    </div>
  );
}
