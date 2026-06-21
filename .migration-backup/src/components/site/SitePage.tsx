import { DashboardPage } from "./pages/DashboardPage";
import { CustomizationPage } from "./pages/CustomizationPage";
import { ThemePage } from "./pages/ThemePage";
import { SeoPage } from "./pages/SeoPage";
import { DomainPage } from "./pages/DomainPage";
import { SettingsPage as SiteSettingsPage } from "./pages/SettingsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CouponsPage } from "./pages/CouponsPage";
import { ShippingPage } from "./pages/ShippingPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { BookingsPage } from "./pages/BookingsPage";
import { WhatsAppCatalogPage } from "./pages/WhatsAppCatalogPage";
import { SiteOperationsTab } from "./pages/SiteOperationsTab";

type Props = { subPath: string };

export const SitePage = ({ subPath }: Props) => {
  const key = (subPath || "").toLowerCase();

  switch (key) {
    case "":
    case "dashboard":
      return <DashboardPage />;
    case "customization":
    case "pages":
    case "sections":
    case "builder":
      return <CustomizationPage />;
    case "theme":
    case "store":
      return <ThemePage />;
    case "seo":
      return <SeoPage />;
    case "domain":
      return <DomainPage />;
    case "settings":
      return <SiteSettingsPage />;
    case "leads":
      return <LeadsPage />;
    case "products":
      return <ProductsPage filterType="physical" />;
    case "physical-products":
      return <ProductsPage filterType="physical" />;
    case "digital-products":
      return <ProductsPage filterType="digital" />;
    case "operations":
      return <SiteOperationsTab />;
    case "orders":
      return <OrdersPage />;
    case "customers":
      return <CustomersPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "coupons":
      return <CouponsPage />;
    case "shipping":
      return <ShippingPage />;
    case "payments":
      return <PaymentsPage />;
    case "bookings":
      return <BookingsPage />;
    case "whatsapp-catalog":
      return <WhatsAppCatalogPage />;
    default:
      return <DashboardPage />;
  }
};
