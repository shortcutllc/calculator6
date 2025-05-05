<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createClient } from '@supabase/supabase-js';

const props = defineProps<{
  id: string;
  supabaseUrl: string;
  supabaseKey: string;
}>();

const proposal = ref(null);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const supabase = createClient(props.supabaseUrl, props.supabaseKey);
    const { data, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', props.id)
      .single();

    if (fetchError) throw fetchError;
    proposal.value = data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="proposal-viewer">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="proposal">
      <!-- Proposal content -->
    </div>
  </div>
</template>

<style>
.proposal-viewer {
  display: block;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>