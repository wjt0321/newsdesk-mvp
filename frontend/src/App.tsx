import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "./components/AppShell";
import { TodayPage } from "./pages/TodayPage";
import { StoriesPage } from "./pages/StoriesPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { SourcesPage } from "./pages/SourcesPage";
import { SourceDetailPage } from "./pages/SourceDetailPage";
import { SourceHealthPage } from "./pages/SourceHealthPage";
import { BriefingPage } from "./pages/BriefingPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="channels" element={<ChannelsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="sources/:id" element={<SourceDetailPage />} />
          <Route path="source-health" element={<SourceHealthPage />} />
          <Route path="briefing" element={<BriefingPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}

export default App;
