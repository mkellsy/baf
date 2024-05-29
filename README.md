# Big Ass Fans

Implementation of Big Ass Fans protocol for TypeScript.

This exposes a method to interact with Big Ass Fans devices. This requires the client to impliment the system that needs to be intergrated.

## API

You will need information from MDNS to establish a connection to a deice.

```js
this.discovery = new MDNSServiceDiscovery({
    type: "api",
    protocol: Protocol.TCP,
});

this.discovery.onAvailable(this.onAvailable);
```

Once you have the IP address, name and model, you can create a connetcion to the fan.

```js
const connection = new Connection(ip.address, host.id, host.name, host.model);

connection.on("Connect", onConnect);
connection.on("Disconnect", onDisconnect);
connection.on("Response", onResponse);
connection.on("Error", onError);

await connection.connect();

connection.write([0x12, 0x04, 0x1a, 0x02, 0x08, 0x03]);
connection.write([0x12, 0x04, 0x1a, 0x02, 0x08, 0x06]);
connection.write([0x12, 0x02, 0x1a, 0x00]);
```
