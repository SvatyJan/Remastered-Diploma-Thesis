from pathlib import Path
path = Path(r"c:/xampp/htdocs/Remastered RPG/dtrpg/client/App.tsx")
text = path.read_text()
import_marker = "import ShopPage from './pages/Shop'\n"
if "import BattlePage from './pages/Battle'\n" not in text:
    text = text.replace(import_marker, import_marker + "import BattlePage from './pages/Battle'\n")
route_marker = "        <Route path=\"/shop\" element={<ShopPage />} />\n"
new_route = "        <Route path=\"/battle\" element={<BattlePage />} />\n"
if new_route not in text:
    text = text.replace(route_marker, new_route + route_marker)
path.write_text(text)
