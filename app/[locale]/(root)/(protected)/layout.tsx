const ProtectedLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return ( 
    <div className="min-h-full flex flex-col items-center justify-center px-4">
      {children}
    </div>
   )
}
 
export default ProtectedLayout