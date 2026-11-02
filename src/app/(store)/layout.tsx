import StoreFooter from "@/domains/store/shared/components/footer";
import StoreNavBar from "@/domains/store/shared/components/navbar";
import { StoreProviders } from "@/domains/store/shared/components/storeProviders";
import { getStoreCategoriesSafe } from "@/shared/lib/storeData";

const StoreLayout = async ({ children }: { children: React.ReactNode }) => {
  // loaded on the server, so the category menu is in the HTML instead of loading after the page
  const categories = await getStoreCategoriesSafe();

  return (
    <main className="bg-gray-50">
      <StoreProviders>
        <StoreNavBar categories={categories} />
        {children}
        <StoreFooter />
      </StoreProviders>
    </main>
  );
};

export default StoreLayout;
