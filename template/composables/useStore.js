import { ref } from "vue";
import { version } from "../package.json";

const loading = ref(false);
const disableLoading = ref(false);

const useStore = () => {
  return {
    version: ref(version),
    loading,
    disableLoading,
  };
};

export default useStore;
