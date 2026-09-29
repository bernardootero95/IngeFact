import { ServicePage, serviceMetadata } from "@/components/services/ServicePage";
import { SERVICES } from "@/data/services";

export const metadata = serviceMetadata(SERVICES.documentoSoporte);

export default function Page() {
  return <ServicePage service={SERVICES.documentoSoporte} />;
}
