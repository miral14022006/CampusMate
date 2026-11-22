import sys
from app.services.chat_service import process_query

def main():
    print("=" * 60)
    print("        CampusMate Multilingual Assistant CLI")
    print("   Type your question in English, Hindi, Gujarati, Hinglish")
    print("   or type 'exit' to quit.")
    print("=" * 60)

    session_id = "cli_session_1"

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print("Goodbye!")
                break

            res = process_query(user_input, session_id=session_id)
            print(f"\nAssistant: {res['answer']}\n")

            if res.get("source_doc"):
                print(f"Source: {res['source_doc']}")
            if res.get("citations"):
                for c in res["citations"]:
                    print(f"  • [Doc: {c['doc_name']}, Page: {c['page']}]")

        except (KeyboardInterrupt, EOFError):
            print("\nExiting CampusMate CLI.")
            break

if __name__ == "__main__":
    main()
