import { supabase } from "@/integrations/supabase/client";

export type EstadoPush = "nao_suportado" | "bloqueado" | "desligado" | "ligado" | "abrir_aba";

/** Chave pública dos avisos. Não é segredo; a secreta fica só no servidor. */
const CHAVE_PUBLICA =
  "BL9WFuMmGyevPIZe5zGx2pM4D_4lOi8M4g2oPAyGoXlmhAabig3kdOSfD9PyA6F-CyzsvEy9uIoDauYuyS8AOZA";

const SW = "/push-sw.js";

function suportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function dentroDeMoldura(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

function base64ParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const limpo = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(limpo);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i += 1) saida[i] = bruto.charCodeAt(i);
  return saida;
}

function nomeNavegador(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Navegador";
}

/** Em que pé está o push neste computador. */
export async function estadoDoPush(): Promise<EstadoPush> {
  if (!suportado()) return "nao_suportado";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return dentroDeMoldura() ? "abrir_aba" : "desligado";
  const reg = await navigator.serviceWorker.getRegistration(SW);
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao ? "ligado" : "desligado";
}

/** Pede autorização e grava a inscrição deste computador. */
export async function ligarPush(): Promise<EstadoPush> {
  if (!suportado()) return "nao_suportado";
  if (dentroDeMoldura() && Notification.permission !== "granted") return "abrir_aba";

  const permissao = await Notification.requestPermission();
  if (permissao === "denied") return "bloqueado";
  if (permissao !== "granted") return "desligado";

  const reg = await navigator.serviceWorker.register(SW);
  await navigator.serviceWorker.ready;

  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaBytes(CHAVE_PUBLICA),
    }));

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("sem sessão");

  const json = inscricao.toJSON();
  const { error } = await supabase.from("push_inscricoes").upsert(
    {
      user_id: uid,
      endpoint: inscricao.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      navegador: nomeNavegador(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return "ligado";
}

/** Desliga só neste computador. */
export async function desligarPush(): Promise<EstadoPush> {
  const reg = await navigator.serviceWorker.getRegistration(SW);
  const inscricao = await reg?.pushManager.getSubscription();
  if (inscricao) {
    await supabase.from("push_inscricoes").delete().eq("endpoint", inscricao.endpoint);
    await inscricao.unsubscribe();
  }
  return "desligado";
}
