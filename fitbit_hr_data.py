import pandas as pd
import datetime
import numpy as np
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('filename',
                        nargs='?',
                        default='heartrate_data.csv',
                        help="The filename to which the heartrate data should be saved (as a csv)")
parser.add_argument('start_time',
                        nargs='?',
                        default='00:00:00',
                        help="The time from which to get the heartrate time series (in the format 'hour:minutes:seconds')")
parser.add_argument('end_time',
                        nargs='?',
                        default='23:59:59',
                        help="The time up to which to get the heartrate time series (in the format 'hour:minutes:seconds')")
args = parser.parse_args()

# Ensure that a fitbit connector library is available (using https://github.com/dre2004/python-fitbit)
current_dir_ls = os.listdir()
if 'python_fitbit' not in current_dir_ls:
    if 'python-fitbit' not in current_dir_ls:
        os.system('git clone https://github.com/dre2004/python-fitbit')
    os.system('mv python-fitbit/ python_fitbit')

import python_fitbit.fitbit as fitbit
import python_fitbit.gather_keys_oauth2 as Oauth2

def get_oauth2_tokens(CLIENT_ID, CLIENT_SECRET):
    server = Oauth2.OAuth2Server(CLIENT_ID, CLIENT_SECRET)
    server.browser_authorize()
    ACCESS_TOKEN = str(server.fitbit.client.session.token['access_token'])
    REFRESH_TOKEN = str(server.fitbit.client.session.token['refresh_token'])

    return ACCESS_TOKEN, REFRESH_TOKEN


def get_fitbit_hr_data(CLIENT_ID, CLIENT_SECRET, start_time=None, end_time=None):
    ACCESS_TOKEN, REFRESH_TOKEN = get_oauth2_tokens(CLIENT_ID, CLIENT_SECRET)
    auth2_client = fitbit.Fitbit(CLIENT_ID, CLIENT_SECRET, oauth2=True, access_token=ACCESS_TOKEN, refresh_token=REFRESH_TOKEN)

    #yesterday = str((datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d"))

    fit_statsHR = auth2_client.intraday_time_series('activities/heart', detail_level='1sec', start_time=None, end_time=None)
    fit_statsHR_df = pd.DataFrame(np.array([ [hr_reading['time'], hr_reading['value']]
                                                for hr_reading in fit_statsHR['activities-heart-intraday']['dataset']]) ,
                                                columns=['time', 'heartrate'])
    return fit_statsHR_df

if __name__ == '__main__':
    CLIENT_ID = '22DQB4'
    CLIENT_SECRET = '6904ab6667850a0a249ff2f048b73dd1'

    fitbit_hr_data = get_fitbit_hr_data(CLIENT_ID, CLIENT_SECRET, args.start_time, args.end_time)
    fitbit_hr_data.to_csv(args.filename, index=False)
