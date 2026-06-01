import { PipelineDashboard } from "@/components/pipeline/PipelineDashboard";
import { ProBlocker } from "@/components/ProBlocker";

export default function Pipeline() {
  return (
    <ProBlocker feature="pipeline">
      <PipelineDashboard />
    </ProBlocker>
  );
}
