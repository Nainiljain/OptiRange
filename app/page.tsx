import { getUser } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function Home() {
  const user = await getUser();
  // user is already a plain serialised object from getUser()
  return <HomeClient user={user} />;
}
