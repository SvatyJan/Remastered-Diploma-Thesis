import { registerUser } from "@/lib/services/users";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Registrace</h1>
      <form action={registerUser.toString()} className="space-y-4">
        <input name="email" type="email" placeholder="Email" className="w-full border p-2 rounded" required />
        <input name="password" type="password" placeholder="Heslo (min. 8)" className="w-full border p-2 rounded" required />
        <button className="w-full rounded bg-black text-white py-2">Vytvořit účet</button>
      </form>
      <p className="text-sm text-gray-500 mt-2">Po registraci budeš přihlášen/a.</p>
    </div>
  );
}
