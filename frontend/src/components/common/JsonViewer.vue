<template>
  <div>
    <json-viewer
      :value="data"
      :expand-depth="expandDepth"
      expand-icon-style="circle"
      sort
      :expand-on-click="expandOnClick"
      :show-double-quotes="false"
      :show-length="true"
      :copyable="{ copyText: '複製', copiedText: '已複製！', timeout: 2000 }"
      :boxed="false"
      class="json-viewer-theme" />
  </div>
</template>

<script setup>
import JsonViewer from "vue-json-viewer";
import "vue-json-viewer/style.css";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  expandDepth: {
    type: Number,
    default: 2,
  },
  expandOnClick: {
    type: Boolean,
    default: true,
  },
});
</script>

<style>
.json-viewer-theme {
  background: var(--custom-bg-primary) !important;
  white-space: nowrap;
  color: var(--custom-text-primary) !important;
  font-size: 14px;
  font-family: Consolas, Menlo, Courier, monospace;

  .jv-ellipsis {
    color: var(--custom-text-secondary) !important;
    background-color: var(--custom-bg-quaternary) !important;
    display: inline-block;
    line-height: 0.9;
    font-size: 0.9em;
    padding: 0px 4px 2px 4px;
    border-radius: 3px;
    vertical-align: 2px;
    cursor: pointer;
    user-select: none;
  }
  .jv-button {
    color: #49b3ff;
  }
  .jv-key {
    color: var(--custom-text-primary) !important;
  }
  .jv-item {
    &.jv-array {
      color: var(--custom-text-primary) !important;
    }
    &.jv-boolean {
      color: #fc1e70;
    }
    &.jv-function {
      color: #067bca;
    }
    &.jv-number {
      color: #fc1e70;
    }
    &.jv-number-float {
      color: #fc1e70;
    }
    &.jv-number-integer {
      color: #fc1e70;
    }
    &.jv-object {
      color: var(--custom-text-primary) !important;
    }
    &.jv-undefined {
      color: #e08331;
    }
    &.jv-string {
      color: #42b983;
      word-break: break-word;
      white-space: normal;
    }
  }
  .jv-code {
    .jv-toggle {
      &:before {
        padding: 0px 2px;
        border-radius: 2px;
      }
      &:hover {
        &:before {
          background: var(--custom-bg-quaternary) !important;
        }
      }
    }
  }
}
</style>
