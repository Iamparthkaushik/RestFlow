const ProtectedLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return ( 
    <div className="w-full flex-1 flex flex-col items-center">
      {children}
    </div>
   )
}
 
export default ProtectedLayout