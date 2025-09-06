import { prisma } from "@/db";
import { createCharacter } from "@/lib/services/characters";

export default async function NewCharacterPage() {
  const ancestries = await prisma.ancestry.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vytvořit postavu</h1>
      <form action={createCharacter.toString()} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Jméno postavy</label>
          <input name="name" className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Rasa</label>
          <select name="ancestryId" className="w-full border p-2 rounded">
            {ancestries.map((a) => (
              <option key={a.id.toString()} value={a.id.toString()}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded bg-black text-white py-2 px-4">Založit postavu</button>
      </form>
    </div>
  );
}
