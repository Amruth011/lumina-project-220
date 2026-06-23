import { InterviewPrep } from "@/components/interview/InterviewPrep";
import { ProBlocker } from "@/components/ProBlocker";

export default function Interview() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300">
      <ProBlocker feature="interview">
        <InterviewPrep />
      </ProBlocker>
    </div>
  );
}
