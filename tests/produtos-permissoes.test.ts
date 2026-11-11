import { describe, expect, test } from "bun:test";
import { canEdit, type Profile } from "../src/lib/auth";

function perfil(role: Profile["role"], permissions: string[]): Profile {
  return { id: "usuario-teste", nome: "Teste", email: "", role, permissions, must_change_password: false };
}

describe("permissão para destravar Produtos", () => {
  test("operador com edição de Produtos pode destravar", () => {
    expect(canEdit(perfil("operador", ["biblioteca.produtos"]), "biblioteca.produtos")).toBe(true);
  });
  test("gestor com edição de Produtos pode destravar", () => {
    expect(canEdit(perfil("gestor", ["biblioteca.produtos"]), "biblioteca.produtos")).toBe(true);
  });
  test("permissão somente leitura não permite destravar", () => {
    expect(canEdit(perfil("operador", ["biblioteca.produtos:leitura"]), "biblioteca.produtos")).toBe(false);
  });
  test("sem permissão não permite destravar", () => {
    expect(canEdit(perfil("operador", []), "biblioteca.produtos")).toBe(false);
  });
  test("admin continua podendo destravar", () => {
    expect(canEdit(perfil("admin", []), "biblioteca.produtos")).toBe(true);
  });
});