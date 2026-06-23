import { ResumeArsenal } from "@/components/arsenal/ResumeArsenal";
import { ProBlocker } from "@/components/ProBlocker";

export default function Arsenal() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300">
      <ProBlocker feature="arsenal">
        <ResumeArsenal />
      </ProBlocker>
    </div>
  );
}
