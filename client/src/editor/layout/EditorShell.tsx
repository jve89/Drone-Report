// client/src/editor/layout/EditorShell.tsx
import Canvas from "../Canvas";
import Toolbar from "../Toolbar";
import FirstRunBanner from "../onboarding/FirstRunBanner";
import Coachmark from "../onboarding/Coachmark";
import { useEditor } from "../../state/editor";
import ViewerControls from "../ViewerControls";
import LeftPane from "../LeftPane";
import RightPane from "../RightPane";

export default function EditorShell() {
  const { template } = useEditor();

  return (
    <div className="flex flex-col h-screen">
      <FirstRunBanner />
      <Toolbar />
      <div className="flex flex-1 min-h-0 relative">
        {!template && <Coachmark />}
        {/* Left: navigation */}
        <LeftPane />
        {/* Center: canvas + controls */}
        <main className="relative flex-1 min-w-0 flex flex-col overflow-auto" role="main" aria-label="Editor canvas">
          <Canvas />
          <ViewerControls />
        </main>
        {/* Right: editors */}
        <RightPane />
      </div>
    </div>
  );
}
