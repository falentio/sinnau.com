<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";

  const createState = (action: () => Promise<unknown>) => {
    let state = $state("idle" as "idle" | "loading" | "success" | "error");
    let data = $state<unknown>(null);
    return {
      get data() {
        return data;
      },
      async run() {
        state = "loading";
        try {
          data = await action();
          state = "success";
        } catch (error) {
          console.error(error);
          state = "error";
        }
      },
      get state() {
        return state;
      },
    };
  };

  const buttons = [
    {
      action: createState(async () => await client.ping()),
      label: "Ping",
    },
    {
      action: createState(async () => await client.unimplemented()),
      label: "Unimplemented",
    },
  ];
</script>

{#each buttons as button}
  <div class="flex flex-row items-center gap-2 p-6 border shadow-md rounded-md">
    <div>
      <div>State: {button.action.state}</div>
      <div>
        <pre class="text-xs whitespace-pre-wrap">{JSON.stringify(
            button.action.data,
            null,
            2
          )}</pre>
      </div>
    </div>
    <Button
      onclick={button.action.run}
      disabled={button.action.state === "loading"}
    >
      {button.label} ({button.action.state})
    </Button>
  </div>
{/each}
