// @ts-check
"use strict";

// Fiação com o VS Code: diagnósticos do {% schema %} em sections/*.liquid e
// blocks/*.liquid. Toda a lógica fica em lib/ (pura e testável); aqui só se
// converte offset em posição e se escuta o editor.

const vscode = require("vscode");
const { validarLiquid, esquemaDoArquivo } = require("./lib/schema");

const ESPERA_MS = 300;

/** @param {vscode.ExtensionContext} contexto */
function activate(contexto) {
	const colecao = vscode.languages.createDiagnosticCollection("shopify-snippets");
	contexto.subscriptions.push(colecao);

	/** @type {Map<string, NodeJS.Timeout>} */
	const pendentes = new Map();

	/** @param {vscode.TextDocument} documento */
	function validar(documento) {
		if (documento.uri.scheme !== "file" && documento.uri.scheme !== "untitled") return;
		if (!esquemaDoArquivo(documento.uri.path)) return;
		const ativo = vscode.workspace.getConfiguration("shopifySnippets", documento.uri).get("validarSchema", true);
		if (!ativo) {
			colecao.delete(documento.uri);
			return;
		}
		const problemas = validarLiquid(documento.uri.path, documento.getText());
		colecao.set(
			documento.uri,
			problemas.map((p) => {
				const intervalo = new vscode.Range(documento.positionAt(p.inicio), documento.positionAt(p.fim));
				const severidade = p.severidade === "aviso" ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
				const diagnostico = new vscode.Diagnostic(intervalo, p.mensagem, severidade);
				diagnostico.source = "Snippets for Shopify";
				return diagnostico;
			})
		);
	}

	/** @param {vscode.TextDocument} documento */
	function agendar(documento) {
		const chave = documento.uri.toString();
		const anterior = pendentes.get(chave);
		if (anterior) clearTimeout(anterior);
		pendentes.set(
			chave,
			setTimeout(() => {
				pendentes.delete(chave);
				validar(documento);
			}, ESPERA_MS)
		);
	}

	contexto.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(validar),
		vscode.workspace.onDidChangeTextDocument((e) => agendar(e.document)),
		vscode.workspace.onDidCloseTextDocument((d) => colecao.delete(d.uri)),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("shopifySnippets")) vscode.workspace.textDocuments.forEach(validar);
		}),
		{ dispose: () => pendentes.forEach((t) => clearTimeout(t)) }
	);

	vscode.workspace.textDocuments.forEach(validar);
}

function deactivate() {}

module.exports = { activate, deactivate };
