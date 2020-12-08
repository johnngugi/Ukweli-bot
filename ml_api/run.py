from api.app import create_app
from api.config import load_config

config = load_config()

application = create_app()

application.config.from_object(config)

if __name__ == "__main__":
    application.run()
