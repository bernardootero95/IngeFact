import { ServicePage, serviceMetadata } from "@/components/services/ServicePage";
import { SERVICES } from "@/data/services";

export const metadata = serviceMetadata(SERVICES.facturacion);

export default function Page() {
  return <ServicePage service={SERVICES.facturacion} />;
}
