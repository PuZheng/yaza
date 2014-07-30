#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
read unicode list from stdin and generate a bold version font

http://www.fontforge.org/python.html#Font

SYNOPSIS:
    Usage: make-bold-font.py [OPTIONS]


OPTIONS:
    -h show this help
    -v use verbose mode
    -f font file to be converted
    -n new font name
    -w changed weight

WARNING:
    this script may be EXTREMELY slow due to the complexities of generate
    bolder font
"""
import sys
from getopt import getopt
import imp

font_forge_lib = '/usr/lib/python2.7/dist-packages/fontforge.so'

if __name__ == "__main__":

    opts, _ = getopt(sys.argv[1:], 'hvf:n:w:')
    verbose = False
    for o, v in opts:

        if o == '-h':
            print __doc__
            sys.exit(1)
        elif o == '-v':
            verbose = True
        elif o == '-f':
            font_path = v
        elif o == '-n':
            new_font_name = v
        elif o == '-w':
            changed_weight = int(v)
        else:
            print "unknown option: " + o
            sys.exit(1)

    try:
        font_path
        new_font_name
        changed_weight
    except NameError:
        print __doc__
        sys.exit(1)

    fontforge = imp.load_dynamic('fontforge', font_forge_lib)
    font = fontforge.open(font_path)
    lineno = 0
    success = 0
    for l in sys.stdin.xreadlines():
        if l:
            uni = l.strip().upper()

            uni = uni[2:]

            if verbose:
                print lineno, ": ", uni, unichr(int(uni, 16))
                lineno += 1

            if int(uni, 16) < 256:
                uni = int(uni, 16)
            else:
                uni = 'uni' + uni

            try:
                glyph = font[65]
                glyph.changeWeight(changed_weight)
                success += 1
            except TypeError:  # 某些字体没有这个字
                if verbose:
                    print 'there\'s no glyph to ', uni
                pass

    if verbose:
        print '%d glyphs made bold!' % success
    font.fontname = new_font_name
    font.weight = 'bold'
    font.generate(new_font_name + ".ttf")
