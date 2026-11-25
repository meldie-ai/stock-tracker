import {
  getActiveShift,
  getCategoriesWithProducts,
  getLastActionByProductId,
  sumSoldByProductId,
} from "@/lib/data";
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
  // started it (or an admin) may sell, adjust stock, or edit prices — mirrors
  // shiftOwnershipError, which exempts admins the same way.
  const isShiftOwner =
    !activeShift ||
    activeShift.startedByUserId === currentUser?.userId ||
    currentUser?.role === "ADMIN";

  const soldByProductId = activeShift ? sumSoldByProductId(activeShift.sales) : new Map<string, number>();

  // Which products currently have something undoable, and what kind — only when the
  // literal last thing that happened to that product this shift was a plain Cash/Card
  // sell or a stock adjustment. A carton-linked product's sale/adjustment may have also
  // triggered a cascade into its carton; the undo route reverses both together (or blocks
  // the whole thing if something newer happened to either side since), so no special-casing
  // is needed here.
  const lastActionByProductId = activeShift
    ? await getLastActionByProductId(activeShift.id)
    : new Map<string, { action: string; note: string | null }>();
  const undoableActionByProductId = new Map<string, "SELL" | "ADJUST">();
  for (const category of categories) {
    for (const product of category.products) {
      const last = lastActionByProductId.get(product.id);
      if (!last) continue;
      if (last.action === "SELL" && (last.note === "Cash sale" || last.note === "Card sale")) {
        undoableActionByProductId.set(product.id, "SELL");
      } else if (last.action === "ADJUST") {
        undoableActionByProductId.set(product.id, "ADJUST");
      }
    }
  }

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
        startedByUsername={activeShift?.startedByUsernameSnapshot ?? null}
        notes={notes}
      />

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No categories yet. Head to Products &amp; Categories to add your first category and products.
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
              undoableActionByProductId={undoableActionByProductId}
              hasActiveShift={!!activeShift}
              isShiftOwner={isShiftOwner}
            />
          ))}
        </TabSwitcher>
      )}
    </div>
  );
}
