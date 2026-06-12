import argparse
from arke_core import interfaz_consciente
from arke_chat import InterfazConsciente


def cli_prompt(text: str) -> None:
    """Run a single prompt through ARKE's conscious interface."""
    respuesta = interfaz_consciente(text)
    print(respuesta)


def cli_chat() -> None:
    """Launch interactive chat session."""
    chat = InterfazConsciente()
    chat.iniciar_dialogo()


def main() -> None:
    parser = argparse.ArgumentParser(description="Herramientas CLI para ARKE")
    subparsers = parser.add_subparsers(dest="command")

    prompt_parser = subparsers.add_parser("prompt", help="Ejecutar un solo prompt")
    prompt_parser.add_argument("texto", help="Texto a procesar por ARKE")

    subparsers.add_parser("chat", help="Iniciar chat interactivo")

    args = parser.parse_args()

    if args.command == "prompt":
        cli_prompt(args.texto)
    elif args.command == "chat":
        cli_chat()
    else:
        parser.print_help()


def entrypoint() -> None:
    """Poetry script entrypoint."""
    main()


if __name__ == "__main__":
    entrypoint()
