import tensorflow as tf
import numpy as np
import pandas as pd

from api.config import PACKAGE_ROOT


model_path = PACKAGE_ROOT/'saved_model'
model = tf.keras.models.load_model(model_path)


def predict(input_data):
    """
    Input format:
    favorites_median, retweets_median, followers_median, f
    riends_median, statuses_median, is_quote_status, verified, text
    """
    inputs = [
        np.array([input_data.get('favorites_median')]),
        np.array([input_data.get('retweets_median')]),
        np.array([input_data.get('followers_median')]),
        np.array([input_data.get('friends_median')]),
        np.array([input_data.get('statuses_median')]),
        np.array([input_data.get('is_quote_status')]),
        np.array([input_data.get('verified')]),
        np.array([(input_data.get('text'))]),
    ]

    prediction = model.predict(inputs)
    return {'predictions': prediction}
