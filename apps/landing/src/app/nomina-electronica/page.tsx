import { ServicePage, serviceMetadata } from "@/components/services/ServicePage";
import { SERVICES } from "@/data/services";

export const metadata = serviceMetadata(SERVICES.nomina);

export default function Page() {
  return <ServicePage service={SERVICES.nomina} />;
}
