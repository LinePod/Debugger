apt-get update


## Setup for gpgl_input bridge

# Install add-apt-repository and curl
apt-get install -y software-properties-common curl

# Install python3.6 from ppa
add-apt-repository ppa:jonathonf/python-3.6
apt-get update
apt-get -y install python3.6

# Install pip
curl https://bootstrap.pypa.io/get-pip.py > get-pip.py
python3.6 get-pip.py
pip3.6 install -r gpgl_input/requirements.txt


## Setup for website

# Install https for apt (needed for yarn) and node
apt-get install -y apt-transport-https nodejs

# Provide node under the usual name node (and not only nodejs)
update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10

# Install yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
apt-get update
apt-get install yarn

# Build website
cd website
yarn install
yarn build
