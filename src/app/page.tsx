import { redirect } from "next/navigation";

export default function RootPage() {
  // 💡 規律：ルートにアクセスしたすべての迷い子を、即座に本物のコックピットへとワープさせる
  redirect("/dashboard");
}