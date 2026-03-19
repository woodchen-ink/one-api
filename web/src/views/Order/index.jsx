import PaymentOrder from 'views/Payment/Order';

export default function OrderManagement() {
  return <PaymentOrder apiPath="/api/user/order" storageKey="userOrder" showGatewayId={false} showUserId={false} />;
}
