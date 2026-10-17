# storage-demo — 30 Aug 2026

Not BusGo. A deliberately boring thermostat, so the mechanism is the only
thing in the file.

## Run it
Open BOTH files as separate tabs from the same place — either both via
`file://` from this folder, or both served by one local server. They must
share an origin or localStorage is not shared.

    python3 -m http.server 8000
    # then http://localhost:8000/setter.html and .../reader.html

## Three things to notice

1. **One key, one JSON blob.** `demo:thermostat` holds the whole state as a
   string. Both pages hardcode the same key. Get the string wrong and you get
   silence, not an error.

2. **`storage` is the bridge.** Writing with `setItem` in one tab fires a
   `storage` event in every *other* tab on that origin. That is the entire
   trick — there is no server.

3. **The event does NOT fire in the tab that wrote it.** Every page has to
   update its own UI directly *and* listen for the others. Nearly everyone
   loses an hour to this once.

## The question to answer before you write the BusGo version

What is the one JSON shape that both `index.html` and `driver.html` agree on?
Write that object down on paper first — its field names and what each one
means. That decision is the actual engineering, and it is what an interviewer
will ask you about. The code is the easy half.
