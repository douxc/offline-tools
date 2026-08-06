import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!border-[#3b3b38] !bg-[#20201e] !text-[#f4f4ef] !shadow-2xl",
          description: "!text-[#9a9a91]",
          actionButton: "!bg-[#d6ff3f] !text-[#171a0b]",
          cancelButton: "!bg-[#30302e] !text-[#f4f4ef]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
