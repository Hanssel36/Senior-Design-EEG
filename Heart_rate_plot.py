import matplotlib.pyplot as plt
import pandas as pd
import csv
import numpy as np
import mplcursors

def Event_line(**kwargs):
    for key,val in kwargs.items(): # key is the event name and val is the corresponding time 
        for j in HR_data.time: 
            if j == val: # checks to see if the picked event time is in the readings
                plt.axvline(x=j, linestyle='dashed', alpha=0.5)
                plt.text(x=j, y=min(HR_data.heartrate), s=key, alpha=0.7, color='#334f8d')
                break
            elif j > val: # If the selected time is not in the reads it will pick the closes thing to the rightmost. Ex 10:37:50 (not in data) will estimate to 10:37:52 (in data)
                plt.axvline(x=j, linestyle='dashed', alpha=0.5)
                plt.text(x=j, y=min(HR_data.heartrate), s=key, alpha=0.7, color='#334f8d')
                break

HR_data = pd.read_csv('heartrate_data.csv')
#Reads CSV file and can turn HR_data into a list 
labels = HR_data.heartrate
x = np.array(HR_data.time)

fig, ax = plt.subplots()
line, = ax.plot(x, labels, "ro")
mplcursors.cursor(ax, hover = True).connect(
    "add", lambda sel: sel.annotation.set_text(labels[sel.target.index])) # this adds the Heart rate for the scrolling window 
mplcursors.cursor(ax, hover = True).connect(
    "add", lambda sel: sel.annotation.set_text(x[sel.target.index])) # this adds the time for the scrolling window
# this can probably be improved to look nicer
plt.plot(HR_data.time,HR_data.heartrate)
plt.title('HRData_Subway')
plt.xlabel('Time')
plt.ylabel('HeartRate(BPM)')
plt.xticks(np.arange(len(HR_data.time), step=10))
Event_line(event1 = '09:37:50', event2 = '10:45:00')
plt.show()