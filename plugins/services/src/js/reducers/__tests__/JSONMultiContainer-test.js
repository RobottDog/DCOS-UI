const Batch = require("#SRC/js/structs/Batch");
const { combineParsers } = require("#SRC/js/utils/ParserUtil");
const { combineReducers } = require("#SRC/js/utils/ReducerUtil");
const JSONMultiContainerParser = require("../JSONMultiContainerParser");
const JSONMultiContainerReducers = require("../JSONMultiContainerReducers");

describe("JSONMultiContainer", function() {
  describe("integrity", function() {
    it("should parse and reduce without changing the JSON", function() {
      const podDefinition = {
        id: "/podABCD",
        labels: {
          POD_LABEL: "foo"
        },
        volumes: [
          {
            name: "volume_1",
            host: "/mnt/volume_1"
          }
        ],
        environment: {
          FOO: "bar"
        },
        networks: [
          {
            mode: "host"
          }
        ],
        containers: [
          {
            name: "container-1",
            image: { kind: "DOCKER", id: "jdef/my-web-service-abc:v1.1.1" },
            endpoints: [
              {
                name: "nginx",
                hostPort: 0,
                protocol: [],
                labels: {
                  VIP_0: "1.2.3.4:80"
                }
              }
            ],
            resources: { cpus: 0.5, mem: 64, disk: "" },
            volumeMounts: []
          },
          {
            name: "container-2",
            image: { kind: "DOCKER", id: "jdef/my-web-service-abc:v1.1.1" },
            endpoints: [
              {
                name: "nginx",
                hostPort: 0,
                protocol: [],
                labels: {
                  VIP_0: "1.2.3.4:80"
                }
              }
            ],
            resources: { cpus: 0.5, mem: 64, disk: "" },
            volumeMounts: []
          }
        ],
        fetch: [],
        ipAddress: null,
        scaling: {
          kind: "fixed",
          instances: 10
        },
        scheduling: {
          placement: {
            constraints: [{ fieldName: "hostname", operator: "UNIQUE" }]
          }
        }
      };

      const reducers = combineReducers(JSONMultiContainerReducers).bind({});
      const parser = combineParsers(JSONMultiContainerParser);
      const batch = parser(
        JSON.parse(JSON.stringify(podDefinition))
      ).reduce(function(batch, item) {
        return batch.add(item);
      }, new Batch());
      const jsonFromBatch = batch.reduce(reducers, {});
      expect(jsonFromBatch).toEqual(podDefinition);
      const batchFromJSONFromBatch = parser(jsonFromBatch).reduce(function(
        batch,
        item
      ) {
        return batch.add(item);
      }, new Batch());
      const jsonFromBatchFromJSONFromBatch = batchFromJSONFromBatch.reduce(
        reducers,
        {}
      );
      expect(jsonFromBatchFromJSONFromBatch).toEqual(podDefinition);
    });
  });
});
