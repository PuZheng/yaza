#! /usr/bin/env python
import os
import json

if __name__ == "__main__":

    config = json.load(file(os.path.join(os.path.split(__file__)[0],
                                         "deploy-conf.json")))
    base = config['upload-files']['base']
    included_dirs = config['upload-files']["include"].get("dirs", [])
    included_files = config['upload-files']["include"].get("files", [])
    excluded_dirs = config['upload-files'].get("exclude", {}).get("dirs", [])
    excluded_files = config['upload-files'].get("exclude", {}).get("files", [])

    def upload_file(file_):
        from yaza.basemain import app
        from yaza.qiniu_handler import upload_text

        print "uploading " + file_ + '...'
        file_name = os.path.relpath(file_, base)
        upload_text(file_name, open(file_).read(),
                    app.config["QINIU_CONF"]["STATIC_BUCKET"])

    included_dirs = [os.path.normpath(os.path.join(base, d))
                        for d in included_dirs]
    included_files = [os.path.normpath(os.path.join(base, f))
                        for f in included_files]
    excluded_dirs = [os.path.normpath(os.path.join(base, d))
                        for d in excluded_dirs]
    excluded_files = [os.path.normpath(os.path.join(base, f))
                        for f in excluded_files]
    for d in included_dirs:
        for root, dir, files in os.walk(d):
            if root not in excluded_dirs:
                for file_ in files:
                    if os.path.join(root, file_) not in excluded_files:
                        upload_file(os.path.join(root, file_))

    for f in included_files:
        upload_file(f)
